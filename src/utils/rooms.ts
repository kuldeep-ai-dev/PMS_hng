export const parseRoomCategory = (type: string) => {
    const match = type.match(/^(.*?)(\s*\(\s*(\d+)\s*pax\s*\))?$/i);
    if (match) {
        return {
            cleanName: match[1].trim(),
            pax: match[3] ? parseInt(match[3]) : 2
        };
    }
    return { cleanName: type, pax: 2 };
};
