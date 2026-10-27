"""Publish one generated snapshot without discarding concurrent repository work."""

import argparse
import subprocess
import sys


DATA_PATHS = {
    "bolt-app/public/data/videos.csv",
    "bolt-app/public/data/videos.json",
    "data/videos.json",
    "bolt-app/src/data/categoryRules.json",
}


def git(*args, check=True):
    return subprocess.run(["git", *args], check=check, text=True, capture_output=True)


def publish(message, paths, attempts=4):
    if not paths or set(paths) - DATA_PATHS:
        raise ValueError("Seuls les fichiers de données générés peuvent être publiés.")
    git("add", "--", *paths)
    staged = git("diff", "--cached", "--name-only", "-z").stdout.split("\0")
    if set(filter(None, staged)) - set(paths):
        raise ValueError("Des fichiers étrangers à cette publication sont déjà indexés.")
    difference = git("diff", "--cached", "--quiet", check=False)
    if difference.returncode == 0:
        print("Données inchangées : aucun commit nécessaire.")
        return
    if difference.returncode != 1:
        difference.check_returncode()
    base = git("rev-parse", "HEAD").stdout.strip()
    git("commit", "-m", message)

    for attempt in range(attempts):
        git("fetch", "--no-tags", "origin", "main")
        upstream = git("rev-parse", "FETCH_HEAD").stdout.strip()
        # A lost response to a successful push must not publish the same commit twice.
        if git("merge-base", "--is-ancestor", "HEAD", upstream, check=False).returncode == 0:
            print("Le commit est déjà présent sur main.")
            return
        if upstream != base:
            if git("merge-base", "--is-ancestor", base, upstream, check=False).returncode != 0:
                raise RuntimeError("L’historique de main a changé ; publication interrompue.")
            rebase = git("rebase", "--onto", upstream, base, check=False)
            if rebase.returncode:
                git("rebase", "--abort", check=False)
                raise RuntimeError("Conflit avec main : les données distantes sont conservées. "
                                   "Relancer la synchronisation depuis la dernière révision.")
            base = upstream
        pushed = git("push", "origin", "HEAD:main", check=False)
        if pushed.returncode == 0:
            print("Données publiées sur main.")
            return
        git("fetch", "--no-tags", "origin", "main")
        current = git("rev-parse", "FETCH_HEAD").stdout.strip()
        if git("merge-base", "--is-ancestor", "HEAD", current, check=False).returncode == 0:
            print("Envoi confirmé par relecture de main.")
            return
        if current == upstream:
            # Permissions/network failures are not repaired by retrying a race.
            raise RuntimeError("Envoi Git refusé sans changement de main : vérifier les droits et le réseau.")
        print(f"main a avancé pendant l’envoi ; reprise {attempt + 1}/{attempts}.")
    raise RuntimeError("main continue d’avancer ; limite de reprises atteinte, sans envoi forcé.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message")
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()
    try:
        publish(args.message, args.paths)
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        # Do not echo subprocess arguments/output: CI credentials may be in Git configuration.
        print(f"Publication interrompue : {error if not isinstance(error, subprocess.CalledProcessError) else 'échec de la commande Git.'}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
