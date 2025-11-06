import { getProjectWithFile } from './get-project-with-file.js';

export async function getCardData({ path, line }) {
    const project = await getProjectWithFile(path)
    await project.init()

    const file = project.getFile(path)
    const card = file.getTaskAtLine(line)
    const data = { ...project.data, ...card.data };
    // flatten the data arrays and objects and exclude functions and return the result
    const flattenedData = Object.fromEntries(
        Object.entries(data).flatMap(([key, value]) => {
            if (Array.isArray(value)) {
                const arrayEntry = [[key, JSON.stringify(value)]];
                if (value.length === 1) {
                    return [...arrayEntry, [`${key}.0`, value[0]]];
                }
                return [...arrayEntry, ...value.map((item, index) => [`${key}.${index}`, item])];
            }
            if (typeof value === 'object' && value !== null) {
                const objectEntry = [[key, JSON.stringify(value)]];
                const flattenedEntries = Object.entries(value).flatMap(([subKey, subValue]) => {
                    if (Array.isArray(subValue)) {
                        const arrayEntry = [[`${key}.${subKey}`, JSON.stringify(subValue)]];
                        if (subValue.length === 1) {
                            return [...arrayEntry, [`${key}.${subKey}.0`, subValue[0]]];
                        }
                        return [...arrayEntry, ...subValue.map((item, index) => [`${key}.${subKey}.${index}`, item])];
                    }
                    return [[`${key}.${subKey}`, subValue]];
                });
                return [...objectEntry, ...flattenedEntries];
            }
            return [[key, value]];
        })
    );
    return Object.fromEntries(Object.entries(flattenedData).filter(([key, value]) => typeof value !== 'function'));
}