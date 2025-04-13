module.exports = function () {
  return [
    {
      title: "List cards",
      name: "List cards",
      action: async () => {
          console.log("Listing cards");
          this.project.lists.forEach(list => {
              console.log(list.name);
              console.log("-".repeat(list.name.length));
              list.tasks.forEach(card => {
                console.log('\n');  
                console.log(card.interpretedContent);
                console.log('\n\n');
              });
          })
      },
    }
  ] 
}