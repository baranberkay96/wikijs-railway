# Wiki.js 2.5 for Railway: the official image pinned by digest, a config file that
# reads the port from PORT, and a pre-deploy step that finishes the setup wizard
# (first admin from variables) before the public port serves.
ARG WIKIJS_IMAGE=requarks/wiki:2.5.315@sha256:af71a17dc27ccc4c768591b1c504631ed820d9d13d4e8c325be4232c0035638c
FROM ${WIKIJS_IMAGE}

COPY --chown=node:node --chmod=0755 railway/ /wiki/railway/
ENV CONFIG_FILE=/wiki/railway/config.yml

# Image default command: node --no-deprecation server
