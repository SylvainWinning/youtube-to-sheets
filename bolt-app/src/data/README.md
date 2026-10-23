# Règles de classement

Modifier `categoryRules.json` puis livrer la modification par PR. Aucun nouveau service ni classement automatique par analyse de titre.

Ordre de priorité :

1. `myCategory` de la vidéo (catégorie personnelle publiée).
2. `videos` : identifiant vidéo YouTube → catégorie. Pour un sujet inhabituel d’une chaîne, ajouter une exception ici ; utiliser « Non classées » pour ne pas reprendre son défaut.
3. `channels` : identifiant stable de chaîne (`UC…`) → catégorie par défaut. Un changement de nom ne modifie pas cette règle.
4. « Non classées », visible dans le filtre Catégories et la recherche.

`legacyNames` conserve les anciens classements pour lire les exports sans colonne Q, ou pendant la toute première migration encore incomplète. Lors de la première synchronisation complète, les choix existants sont migrés vers les IDs renvoyés par YouTube. `migrationComplete` devient vrai : les nouvelles chaînes ne sont ensuite plus classées d’après leur nom. Ne pas remettre ce drapeau à faux pour une édition normale.

Les IDs viennent du champ `snippet.channelId` de YouTube, transporté dans la colonne Q. La migration est committée avec les exports et le frontend est reconstruit avec le même fichier de règles. Les anciennes colonnes A:P et les catégories personnelles de la dernière copie sont conservées ; les valeurs numériques de catégorie YouTube ne sont pas des catégories éditoriales.
