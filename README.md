# subexplorer

Explorateur web de la base de données OpenSub CRM : parcourt les bases, tables,
colonnes et prévisualise les données.

## Contexte

- Serveur MySQL/MariaDB cible : `srv-opensub-crm.ivry.local` (`10.103.130.55:3306`)

## Lancer en local

```powershell
npm install
Copy-Item .env.example .env   # puis renseigner DB_USER / DB_PASSWORD
npm start
```

Ouvrir http://localhost:3000

## Variables d'environnement

| Variable      | Défaut                        | Description                     |
| ------------- | ----------------------------- | ------------------------------- |
| `DB_HOST`     | `srv-opensub-crm.ivry.local`  | Hôte MySQL                      |
| `DB_PORT`     | `3306`                        | Port MySQL                      |
| `DB_USER`     | `root`                        | Utilisateur                     |
| `DB_PASSWORD` | (vide)                        | Mot de passe                    |
| `DB_NAME`     | (vide)                        | Base par défaut (optionnel)     |
| `PORT`        | `3000`                        | Port d'écoute de l'app web      |

## Docker

```sh
docker build -t subexplorer .
docker run --rm -p 3000:3000 \
  -e DB_HOST=srv-opensub-crm.ivry.local \
  -e DB_USER=... -e DB_PASSWORD=... \
  subexplorer
```

## API

| Méthode | Route                                                     | Description                 |
| ------- | --------------------------------------------------------- | --------------------------- |
| GET     | `/api/health`                                             | Statut + version MySQL      |
| GET     | `/api/databases`                                          | Liste des bases             |
| GET     | `/api/databases/:db/tables`                               | Tables d'une base           |
| GET     | `/api/databases/:db/tables/:table/columns`                | Colonnes d'une table        |
| GET     | `/api/databases/:db/tables/:table/rows?limit=&offset=`    | Lignes (max 500)            |
