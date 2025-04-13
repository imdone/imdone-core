// describe('GetViewUsecase', () => {
//     it('Gets views with default and custom', () => {
//         const defaultFilter = "This is the default filter"
//         const id = "default"
//         const name = "Default View"
//         const lists = [
//             {
//             "name": "NOTE",
//             "hidden": false,
//             "ignore": false
//             },
//             {
//             "name": "What's Due?",
//             "hidden": true,
//             "ignore": false,
//             "filter": "dueDate < \"${tomorrow at 6AM}\" AND list != DONE +dueDate +order",
//             "id": 0
//             },
//             {
//             "name": "BACKLOG",
//             "hidden": false,
//             "ignore": false
//             },
//             {
//             "name": "TODO",
//             "hidden": false,
//             "ignore": false
//             },
//             {
//             "name": "DOING",
//             "hidden": false,
//             "ignore": false
//             },
//             {
//             "name": "DONE",
//             "hidden": true,
//             "ignore": false
//             },
//             {
//             "name": "Recently Completed",
//             "hidden": false,
//             "ignore": false,
//             "filter": "completedDate > \"${7 days ago}\" -completed",
//             "id": 1
//             },
//             {
//             "name": "ABANDONED",
//             "hidden": false,
//             "ignore": false
//             }
//         ]

//         const views = [
//             {
//                 id: "1",
//                 name: "View One",
//                 filter: "View one filter",
//                 lists: [...lists]
//             }
//         ]
//     })
// })