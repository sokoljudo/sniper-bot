
export function getCurrentTimestamp() {
    const now = new Date();
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0'); 
    return `[${now.toLocaleDateString()} ${now.toLocaleTimeString()}.${milliseconds}]`;
}

export function logWithTimestamp(message) {
    console.log(`${getCurrentTimestamp()} ${message}`);
}
