function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

export function formatDate(date: Date, format: string): string {
	const replacements: Record<string, string> = {
		YYYY: String(date.getFullYear()),
		MM: pad(date.getMonth() + 1),
		DD: pad(date.getDate()),
		HH: pad(date.getHours()),
		mm: pad(date.getMinutes()),
		ss: pad(date.getSeconds())
	};

	let result = format;
	for (const token in replacements) {
		if (Object.prototype.hasOwnProperty.call(replacements, token)) {
			result = result.split(token).join(replacements[token]);
		}
	}
	return result;
}
