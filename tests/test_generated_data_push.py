"""Git integration tests use disposable local repositories, never the real remote."""
from pathlib import Path
import re
import shlex
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/publish_generated_data.py'
DATA = 'bolt-app/public/data/videos.json'


def git(repo, *args, check=True):
    return subprocess.run(['git', '-C', str(repo), *args], check=check, text=True, capture_output=True)


def identity(repo):
    git(repo, 'config', 'user.name', 'Synthetic test')
    git(repo, 'config', 'user.email', 'test@example.invalid')
    git(repo, 'config', 'commit.gpgsign', 'false')
    git(repo, 'config', 'core.hooksPath', str(repo / '.git/hooks'))


@pytest.fixture
def repos(tmp_path):
    remote, seed = tmp_path / 'remote.git', tmp_path / 'seed'
    subprocess.run(['git', 'init', '--bare', '--initial-branch=main', str(remote)], check=True, capture_output=True)
    subprocess.run(['git', 'init', '--initial-branch=main', str(seed)], check=True, capture_output=True)
    identity(seed)
    (seed / DATA).parent.mkdir(parents=True)
    (seed / DATA).write_text('base\n')
    (seed / 'app.txt').write_text('base\n')
    git(seed, 'add', '.')
    git(seed, 'commit', '-m', 'base')
    git(seed, 'remote', 'add', 'origin', str(remote))
    git(seed, 'push', 'origin', 'main')
    clones = []
    for name in ['publisher', 'other']:
        clone = tmp_path / name
        subprocess.run(['git', 'clone', str(remote), str(clone)], check=True, capture_output=True)
        identity(clone)
        clones.append(clone)
    return (*clones, remote)


def publish(repo, *paths):
    return subprocess.run([sys.executable, str(SCRIPT), 'Generated snapshot', *(paths or [DATA])],
                          cwd=repo, text=True, capture_output=True)


def update(repo, path, value):
    (repo / path).write_text(value)
    git(repo, 'add', path)
    git(repo, 'commit', '-m', 'Concurrent update')
    git(repo, 'push', 'origin', 'main')


def hook(repo, name, body):
    path = repo / '.git/hooks' / name
    path.write_text('#!/bin/sh\nset -e\n' + body)
    path.chmod(0o755)


def test_existing_concurrent_code_commit_is_preserved(repos):
    publisher, other, remote = repos
    update(other, 'app.txt', 'new code\n')
    (publisher / DATA).write_text('new snapshot\n')
    assert publish(publisher).returncode == 0
    assert git(remote, 'show', 'main:app.txt').stdout == 'new code\n'
    assert git(remote, 'show', 'main:' + DATA).stdout == 'new snapshot\n'


def test_commit_between_fetch_and_push_is_retried_without_force(repos):
    publisher, other, remote = repos
    q = shlex.quote(str(other))
    hook(publisher, 'pre-push', f'''if [ ! -e .git/injected ]; then
      touch .git/injected
      printf 'concurrent code\\n' > {q}/app.txt
      git -C {q} add app.txt
      git -C {q} commit -m 'Concurrent push'
      git -C {q} push origin main
    fi
''')
    (publisher / DATA).write_text('new snapshot\n')
    result = publish(publisher)
    assert result.returncode == 0, result.stderr
    assert 'reprise' in result.stdout
    assert git(remote, 'show', 'main:app.txt').stdout == 'concurrent code\n'
    assert git(remote, 'show', 'main:' + DATA).stdout == 'new snapshot\n'
    assert git(remote, 'rev-list', '--count', 'main').stdout.strip() == '3'


def test_conflicting_newer_snapshot_is_not_overwritten(repos):
    publisher, other, remote = repos
    update(other, DATA, 'newer remote snapshot\n')
    (publisher / DATA).write_text('old producer snapshot\n')
    result = publish(publisher)
    assert result.returncode != 0 and 'Conflit' in result.stderr
    assert git(remote, 'show', 'main:' + DATA).stdout == 'newer remote snapshot\n'
    assert (publisher / DATA).read_text() == 'old producer snapshot\n'
    assert not (publisher / '.git/rebase-merge').exists()


def test_unchanged_data_and_private_files_are_not_committed(repos):
    publisher, _, remote = repos
    before = git(remote, 'rev-parse', 'main').stdout
    (publisher / 'service_account.json').write_text('synthetic credential fixture')
    assert publish(publisher).returncode == 0
    assert git(remote, 'rev-parse', 'main').stdout == before
    assert publish(publisher, 'service_account.json').returncode != 0
    (publisher / DATA).write_text('new snapshot\n')
    assert publish(publisher).returncode == 0
    assert 'service_account.json' not in git(remote, 'ls-tree', '-r', '--name-only', 'main').stdout


@pytest.mark.parametrize('hook_name', ['pre-commit', 'pre-push'])
def test_git_failures_are_not_reported_as_success(repos, hook_name):
    publisher, _, remote = repos
    before = git(remote, 'rev-parse', 'main').stdout
    hook(publisher, hook_name, 'exit 1\n')
    (publisher / DATA).write_text('new snapshot\n')
    assert publish(publisher).returncode != 0
    assert git(remote, 'rev-parse', 'main').stdout == before


def test_producers_share_a_non_cancelling_lock_and_publication_helper():
    workflows = [(ROOT / '.github/workflows' / name).read_text() for name in ['sync.yml', 'export-sheets.yml']]
    groups = [re.search(r'concurrency:\n  group: (.+)', text).group(1) for text in workflows]
    assert groups[0] == groups[1]
    assert 'production' in groups[0] and 'pull_request.number' in groups[0]
    for text in workflows:
        assert 'cancel-in-progress: false' in text
        assert 'python scripts/publish_generated_data.py' in text
        assert 'git push' not in text and 'git pull' not in text


def test_repeated_races_stop_at_the_retry_limit(repos):
    publisher, other, remote = repos
    q = shlex.quote(str(other))
    hook(publisher, 'pre-push', f'''printf 'x' >> {q}/app.txt
      git -C {q} add app.txt
      git -C {q} commit -m 'Another concurrent push'
      git -C {q} push origin main
''')
    (publisher / DATA).write_text('new snapshot\n')
    result = publish(publisher)
    assert result.returncode != 0 and 'limite' in result.stderr
    assert git(remote, 'show', 'main:' + DATA).stdout == 'base\n'
    assert git(remote, 'rev-list', '--count', 'main').stdout.strip() == '5'


def test_lost_push_response_is_reconciled_without_a_duplicate_commit(repos, monkeypatch):
    import importlib.util
    spec = importlib.util.spec_from_file_location('generated_publisher', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    publisher, _, remote = repos
    monkeypatch.chdir(publisher)
    (publisher / DATA).write_text('new snapshot\n')
    real_git = module.git
    pushes = []

    def response_lost(*args, **kwargs):
        result = real_git(*args, **kwargs)
        if args[0] == 'push':
            pushes.append(args)
            assert result.returncode == 0
            result.returncode = 1  # The remote accepted it, but the response was lost.
        return result

    monkeypatch.setattr(module, 'git', response_lost)
    module.publish('Generated snapshot', [DATA], attempts=1)
    assert len(pushes) == 1
    assert git(remote, 'rev-list', '--count', 'main').stdout.strip() == '2'
    assert git(remote, 'show', 'main:' + DATA).stdout == 'new snapshot\n'


def test_unrelated_staged_work_is_not_committed(repos):
    publisher, _, remote = repos
    (publisher / 'app.txt').write_text('unrelated work\n')
    git(publisher, 'add', 'app.txt')
    (publisher / DATA).write_text('new snapshot\n')
    result = publish(publisher)
    assert result.returncode != 0 and 'étrangers' in result.stderr
    assert git(remote, 'rev-list', '--count', 'main').stdout.strip() == '1'


def test_pinned_detached_checkout_can_publish(repos):
    publisher, other, remote = repos
    git(publisher, 'checkout', '--detach')
    update(other, 'app.txt', 'new code\n')
    (publisher / DATA).write_text('new snapshot\n')
    assert publish(publisher).returncode == 0
    assert git(remote, 'show', 'main:' + DATA).stdout == 'new snapshot\n'
    assert git(remote, 'show', 'main:app.txt').stdout == 'new code\n'


def test_shallow_checkout_without_remote_tracking_ref_fetches_the_real_tip(repos):
    publisher, other, remote = repos
    base = git(publisher, 'rev-parse', 'HEAD').stdout.strip()
    (publisher / '.git/shallow').write_text(base + '\n')
    git(publisher, 'checkout', '--detach')
    git(publisher, 'config', '--unset-all', 'remote.origin.fetch')
    update(other, 'app.txt', 'latest code\n')
    (publisher / DATA).write_text('new snapshot\n')
    result = publish(publisher)
    assert result.returncode == 0, result.stderr
    assert git(remote, 'show', 'main:app.txt').stdout == 'latest code\n'
    assert git(remote, 'show', 'main:' + DATA).stdout == 'new snapshot\n'
