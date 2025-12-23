packages/

# Deployable Services (have Dockerfile, package.json with "start" script)

api-polls-admin/ #API for admins to CRUD, open/close polling sessions

api-polls-public/ #API for participants to respond to and view visualizations of polling sessions

api-polls-unified/ #API combining api-polls-admin and api-polls-public as modules of a single unified service

ui-polls-admin/ # TODO - deployable frontend for polls admins

ui-polls-participant/ # TODO - deployable frontend for polls participants

# Infrastructure

db/ # data store for polling sessions data, and survey data. (migrations, not a running service)

# Shared Libraries (imported by deployables)

polls-participant-utils/

api-polls-client/ #class that browsers can use to connect to polls apis.

shared-\*/ #types, schemas, computation functions, etc. used by multiple packages

viz-state-controller/ # MOVE INTO polls-participant-utils

# Testing

integration-tests/ # OUT OF DATE. Meant to run tests of deployed services in testing environments
