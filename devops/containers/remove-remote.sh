#!/bin/bash

docker rm -f git-remote
docker volume rm git-remote.home
docker volume rm git-remote.host-keys
ssh-keygen -R '[localhost]:8022'
