import { getProjectWithFile } from './get-project-with-file.js';

export async function getCardData({ path, line }) {
    const project = await getProjectWithFile(path)
    await project.init()

    const file = project.getFile(path)
    const card = file.getTaskAtLine(line)
    return { ...project.data, ...card.data };
}