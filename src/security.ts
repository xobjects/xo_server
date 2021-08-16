import bcrypt from 'bcrypt';



export async function bcrypt_test_async() {
	let v_t0 = performance.now();
	const v_hash = await bcrypt.hash('hello', 14);
	const v_duration = performance.now() - v_t0;
	console.log(v_duration);
	const v_match_1 = await bcrypt.compare('hello', v_hash);
	const v_match_2 = await bcrypt.compare('hello_', v_hash);
}