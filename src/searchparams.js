import { readable } from '@intrnl/velvet/store';


const _add_listener = addEventListener;
const _remove_listener = removeEventListener;

export const search_params = readable(null, (set) => {
	const update = () => {
		set(new URLSearchParams(location.search));
	};

	_add_listener('popstate', update);
	_add_listener('pushstate', update);
	_add_listener('replacestate', update);

	update();

	return () => {
		_remove_listener('popstate', update);
		_remove_listener('pushstate', update);
		_remove_listener('replacestate', update);
	};
});
