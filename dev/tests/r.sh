#!/bin/bash
NODE_PATH=$(npm root -g) PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node /home/claude/audit/tests/run.js "$@"
