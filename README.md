# Circle FTP Addon

A Stremio-protocol addon project for the Circle FTP catalog.

## Important: manifest template vs. live addon

`manifest.json` documents the addon's ID, supported types, and catalog definitions. It is a **template/reference file**. It does not make the addon installable by itself, because catalog, metadata, and stream requests are served by the Node.js application.

After deploying the Node.js service to a host that supports persistent web services, install the addon using:

`https://YOUR-DEPLOYED-HOST/manifest.json`

Replace the placeholder with the real HTTPS hostname provided by your host. Do not use this GitHub repository's raw `manifest.json` URL as the install URL.

## Deploying

1. Add the Node.js app files from your working local project to this repository (including `package.json` and `index.mjs`).
2. In your host, create a Node web service connected to this repository.
3. Set build command to `npm install` and start command to `npm start`.
4. Confirm the deployed `/manifest.json`, catalog, metadata, and stream endpoints work before sharing the URL.

## Media and authorization

Only expose media URLs you are authorized to access and redistribute. Validate content types before labeling entries as movies or series; application installers and game archives should not be treated as videos. Do not rewrite provider URLs to private IP addresses or bypass access controls.
