CURRENT_DIRECTORY := $(shell pwd)

default: cli

cli:
	@docker-compose run --service-ports --rm captiz_platform sh -c "cd /application && bash"

start:
	@docker-compose up -d

clean:
	@docker-compose rm --force

stop:
	@docker-compose stop

status:
	@docker-compose ps

mongo:
	docker run -it --link captiz_mongo:mongo --rm mongo sh -c 'exec mongo "mongo:27017/captiz_dev"'

restart:
	@docker-compose stop captiz_platform
	@docker-compose start captiz_platform

.PHONY: default clean start stop status cli log cc restart
