# Firebase Hosting for the five static sites (prepared, not applied)

This replaces the nginx Deployments `frontend`, `marketing`, `documentation`, `status` and
`static` on GKE. It has not been applied. Firebase Hosting's no-cost tier covers 10 GB stored and
10 GB transferred a month; the load balancer served 1.85 GiB last month for all five sites.

Setup, once:

```bash
npm i -g firebase-tools
firebase login
cd infra/firebase
firebase hosting:sites:create flowmaestro-app
firebase hosting:sites:create flowmaestro-www
firebase hosting:sites:create flowmaestro-docs
firebase hosting:sites:create flowmaestro-status
firebase hosting:sites:create flowmaestro-static
# .firebaserc already maps the targets to these site ids
```

Build and deploy (from the repository root):

```bash
npm ci
npm run build --workspace=shared
npm run build --workspace=frontend      # VITE_API_URL etc. from frontend/.env.production
npm run build --workspace=marketing
npm run build --workspace=documentation
npm run build --workspace=status
npm run build --workspace=@flowmaestro/widget
mkdir -p infra/firebase/static-public/widget
cp sdks/widget/dist/auto-init.global.js infra/firebase/static-public/widget/widget.js
cd infra/firebase && firebase deploy --only hosting
```

The `static` target reproduces `infra/docker/static/nginx.conf`: any `/widget/<name>.js` is served
as `widget.js` with open CORS headers and a one hour cache. Firebase rewrites answer with a 200 at
the original URL, which is what the nginx `rewrite ... break` did.

Custom domains: add `app`, `www` and the apex, `docs`, `status` and `static` under each site in the
Firebase console. Firebase then asks for these records at Squarespace (values are shown in the
console and differ per site):

| Hostname                                                | Record                                                    | Replaces      |
| ------------------------------------------------------- | --------------------------------------------------------- | ------------- |
| app.flowmaestro.ai                                      | A records Firebase gives you, plus a TXT for verification | A 34.8.178.55 |
| www.flowmaestro.ai, flowmaestro.ai, blog.flowmaestro.ai | same                                                      | A 34.8.178.55 |
| docs.flowmaestro.ai                                     | same                                                      | A 34.8.178.55 |
| status.flowmaestro.ai                                   | same                                                      | A 34.8.178.55 |
| static.flowmaestro.ai                                   | same                                                      | A 34.8.178.55 |

`api.flowmaestro.ai` stays on the GKE load balancer. After the sites serve from Firebase, remove the
five Deployments, their Services and HPAs from `infra/k8s/base`, drop the five hosts from
`infra/k8s/base/ingress.yaml` and the ManagedCertificate, and delete the five images from CI.
Saving: about $14 a month of Autopilot pod requests, and the five image builds per deploy.
