# Using Nodemon
Make sure you have nodemon installed, cd to the directory before Divine and run

``
nodemon --ext js,html,css --ignore DivineBuild/ --watch divinefordota2/ --exec "rm -rf DivineBuild && cp -R divinefordota2/ DivineBuild/ && electron" DivineBuild/
``
