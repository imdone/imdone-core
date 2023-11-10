# Running a git remote in docker

[GitHub - 1nfiniteloop/git-remote: Docker image for a minimal git remote](https://github.com/1nfiniteloop/git-remote)

## Start the container

```shell
 docker run \
   --name=git-remote \
   --detach \
   --publish 0.0.0.0:8022:22 \
   --volume git-remote.home:/home/git \
   --volume git-remote.host-keys:/etc/ssh/host_keys \
   1nfiniteloop/git-remote:latest
```

## Copy id_rsa.pub to the container
<!-- 
#TODO: Generate a key in the container and use that instead of copying the key from the host
Update to use `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_rsa_example" git clone example`
-->
```shell
docker exec -it git-remote mkdir /home/git/authorized_keys
docker cp ~/.ssh/*.pub git-remote:/home/git/authorized_keys
```

## Connect to the container and make id_rsa.pub authorized

```shell
docker exec -it git-remote /bin/bash  
```

```shell
chmod 777 /home/git/authorized_keys/id_rsa.pub
```

## ssh into the container and init the repo

```shell
ssh git@localhost -p 8022
```
  
```shell
init test-project
```

## Set the origin
```shell
git remote add origin ssh://git@localhost:8022/home/git/test-project.git
```



