#!/bin/sh

git interpret-trailers --if-exists doNothing --trailer \
    "Signed-off-by: $DCO_NAME <$DCO_EMAIL>" \
    --in-place "$1"
