#! bin/bash
cd /opt/site
git clone https://github.com/bamsutler/blockTrainer.git
cd blockTrainer
npm install
export NODE_ENV='prod'
npm run start