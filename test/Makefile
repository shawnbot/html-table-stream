NO_COLOR = \x1b[0m
OK_COLOR = \x1b[32;01m
ERROR_COLOR = \x1b[31;01m
WARN_COLOR = \x1b[33;01m

OK = $(OK_COLOR)  ✓ ok$(NO_COLOR)
ERROR = $(ERROR_COLOR)  ✗ not ok$(NO_COLOR)

test:
	@for dir in `ls -1 | egrep ^test-`; do \
		echo "$${dir/test-/}:"; \
		cd $$dir && \
		(sh test.sh | diff expected.json /dev/stdin && echo "$(OK)") || (echo "$(ERROR)" && exit 1); \
	done || exit 1
