module.exports = function () {
  return [
    {
      title: "List cards",
      name: "List cards",
      action: async () => {
          console.log("Listing cards");
          console.log(this.project.lists);
      },
    }
  ] 
}