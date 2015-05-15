test:
	@for dir in `ls -1 | egrep ^test-`; do \
		echo "testing: $${dir/test-/}"; \
		cd $$dir && \
		(sh test.sh | diff expected.json /dev/stdin) || exit 1; \
	done
