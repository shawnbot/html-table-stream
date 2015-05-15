NO_COLOR = \x1b[0m
OK_COLOR = \x1b[32;01m
ERROR_COLOR = \x1b[31;01m
WARN_COLOR = \x1b[33;01m

OK = $(OK_COLOR)  ✓$(NO_COLOR) ok
ERROR = $(ERROR_COLOR)  ✗$(NO_COLOR) not ok

test:
	@dirs=`ls -1 | egrep ^test-`; \
	for dir in $$dirs; do \
		echo "$${dir/test-/}:"; \
		cd $$dir && \
		(sh test.sh | diff expected.json /dev/stdin && echo "$(OK)") || (echo "$(ERROR)" && exit 1); \
	done || exit 1
