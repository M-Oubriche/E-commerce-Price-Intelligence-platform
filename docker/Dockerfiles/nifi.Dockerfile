# docker/Dockerfiles/nifi.Dockerfile

FROM apache/nifi:1.25.0

# Future customization point — add custom NAR files here when needed:
# COPY nifi/nars/nifi-bigtable-nar-1.0.jar ${NIFI_HOME}/extensions/
#
# For now the base image is sufficient for local development
