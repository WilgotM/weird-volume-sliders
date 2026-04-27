#!/bin/sh
cd "$(dirname "$0")"
./weird-volume-sliders-macos-arm64 2>/dev/null || ./weird-volume-sliders-macos-x64
