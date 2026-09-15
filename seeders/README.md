# Seeders

Single source of truth for the database seed data. `server/seed.js` imports this
folder, so editing a file here changes what the next seed inserts — you no longer
edit seed content inside the 100-line seeding script.

## Run the seed

```bash
npm --prefix server run seed
```

> ⚠️ **`seed.js` starts by deleting every document in every collection.** If
> `MONGODB_URI` in `server/.env` points at a shared/production database, this
> wipes it. The dev preflight warns when the URI is remote — heed it.

## Layout

```
seeders/
  index.js              barrel that server/seed.js imports
  data/
    accounts.js         default users (credentials read from server/.env)
    properties.js       10 property listings
    trendingProjects.js 2 trending projects (link to properties by index)
    cmsSections.js      hero / about / contact / footer / siteSettings
    leads.js            sample register-interest lead
    messages.js         sample contact message
    wishlist.js         sample saved property
    activityLogs.js     seed-time activity entry
```

## References between records

`_id`s only exist after insertion, so relationships are expressed by reference
and resolved by `server/seed.js`:

- `propertyIndex` — an index into `properties.js`
- `userRef` / account `ref` — names an account defined in `accounts.js`

## Default accounts

Emails and passwords are **not** stored in this folder. They are read from
`server/.env` at seed time (keys below), so secrets stay out of version control.
An optional account whose email key is unset is skipped — that is how the
property-handler stays optional.

| Role            | Name             | Email key                       | Password key                       |
| --------------- | ---------------- | ------------------------------- | ---------------------------------- |
| admin           | Crystal Admin    | `DEFAULT_ADMIN_EMAIL`           | `DEFAULT_ADMIN_PASSWORD`           |
| property-handler| Property Handler | `DEFAULT_PROPERTY_HANDLER_EMAIL`| `DEFAULT_PROPERTY_HANDLER_PASSWORD`|
| employee        | Crystal Employee | `DEFAULT_EMPLOYEE_EMAIL`        | `DEFAULT_EMPLOYEE_PASSWORD`        |
| user            | Crystal User     | `DEFAULT_USER_EMAIL`            | `DEFAULT_USER_PASSWORD`            |
| guest           | Crystal Guest    | `DEFAULT_GUEST_EMAIL`           | `DEFAULT_GUEST_PASSWORD`           |

The current values live in `server/.env`. To reset a password, change it there
and re-run the seed (passwords are bcrypt-hashed on save).
