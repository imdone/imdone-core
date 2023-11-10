#!/bin/bash

 docker run \
   --name=git-remote \
   --detach \
   --publish 0.0.0.0:8022:22 \
   --volume git-remote.home:/home/git \
   --volume git-remote.host-keys:/etc/ssh/host_keys \
   1nfiniteloop/git-remote:latest

docker exec -it git-remote mkdir /home/git/authorized_keys

# TODO: Generate a key in the container and use that instead of copying the key from the host
# Update to use `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_example" git clone example`


docker cp ~/.ssh/id_rsa.pub git-remote:/home/git/authorized_keys
echo "make authorized_keys owned by git"
docker exec -it git-remote chown -R git:git /home/git/authorized_keys/id_rsa.pub
docker exec -it git-remote chmod 777 /home/git/authorized_keys/id_rsa.pub
docker exec -it git-remote ls -lrt /home/git/authorized_keys

ssh git@localhost -p 8022 'init test-project'

