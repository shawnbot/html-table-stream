#!/bin/sh
# explictly look for headers in <thead>, body rows in <tbody>
../../bin/html-table-stream \
    --header-row 'thead tr' \
    --body-row 'tbody tr' \
    --table .statistics input.html
