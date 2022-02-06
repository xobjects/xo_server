export function composer<T, C = any>(p_object: any, ...p_composers) {

	const v_props = {};
	const v_proto = {};
	let v_static = {};

	const v_init: (p_config?: C) => void = p_object[composer.init];

	if (p_object[composer.is_composer] === true) {
		throw 'invalid composer - 1';
	}

	Object.assign(v_static, p_object[composer.static] ?? {});

	for (const [v_name, v_value] of Object.entries<any>(p_object)) {
		if (v_value instanceof Function) {
			if (v_value[composer.is_composer] === true) {
				throw 'invalid composer - 2';
			} else {
				v_proto[v_name] = v_value;
			}
		} else {
			v_props[v_name] = v_value;
		}
	}

	// now add any composers..
	for (const v_composer of p_composers) {
		Object.assign(v_props, v_composer[composer.props]);
		Object.assign(v_proto, v_composer[composer.proto]);
	}

	const v_composer = (p_config?: C) => {
		const v_new_object = Object.assign(Object.create(v_proto), v_props);
		v_init?.call(v_new_object, p_config);
		return v_new_object as T;
	};

	v_composer[composer.is_composer] = true;
	Object.assign(v_composer, { [composer.props]: v_props, [composer.proto]: v_proto, [composer.init]: v_init, ...v_static });

	return v_composer;
};

composer.props = Symbol('props');
composer.proto = Symbol('proto');
composer.init = Symbol('init');
composer.is_composer = Symbol('is_composer');
composer.static = Symbol('static');