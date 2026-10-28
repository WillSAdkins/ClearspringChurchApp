#!/bin/sh
# Rebuild the 3D bundle after changing anything in tools/bible3d.
# Needs Node. The first time:  cd tools/bible3d && npm install
cd "$(dirname "$0")" && npm run build
