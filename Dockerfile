FROM node:6.8
RUN apt-get update && apt-get install -y ruby-full
RUN gem install --no-rdoc --no-ri sass -v 3.4.22
RUN gem install --no-rdoc --no-ri compass
RUN npm install -g nodemon bower grunt-cli forever
RUN apt-get install -y git
