# imdone-sample-plugin
A sample plugin for [Imdone: Kanban with extreme context.](https://imdone.io/)
Built using the [imdone-api](https://github.com/imdone/imdone-api)

## Getting started
1. To start your first plugin, clone this repo into your project's `.imdone/plugins` folder and modify the main.js to suit your needs.
2. Build your plugin with `npm build`
3. Start imdone and enable **Development mode** in your project's plugin settings
4. To debug, open the devtools console in imdone
5. To submit a plugin, open a pull request to [imdone/imdone-plugins](https://github.com/imdone/imdone-plugins)

## Features
### Strike through completed checklist items
Implemented in the `onTaskUpdate` method

### Board Actions
Implemented in the `getBoardActions` method
| Title                   | Description                         |
|-------------------------|-------------------------------------|
| Filter for urgent cards | Only show cards with **urgent** tag |
| Add a card in TODO      | Add a card in the **TODO** list     |
| Test snackBar           | Show a snackbar message             |
| Test toast              | Show a toast message                |

### Card Actions
Implemented in the `getCardActions` method
| Title                 | Description                                                    |
|-----------------------|----------------------------------------------------------------|
| Write task to console | Write the active task to the devtools console                  |
| Add metadata:value    | Add **metadata:value** to card based on key, value in settings |
| Add a tag             | Add a tag to card based on tags in settings                    |
| Copy markdown         | Copy card markdown to clipboard                                |
| Copy Html             | Copy card html to clipboard                                    |

### Card Properties
Implemented in `getCardProperties` method
Use these properties with string interpolation in your cards. (e.g. `${timestamp}`)
| Name       | Description                       |
|------------|-----------------------------------|
| date       | A human readable date             |
| time       | A local time string               |
| timestamp  | The current date as an ISO string |
| sourceLink | A link to the card source         |
