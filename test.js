let arr1 = {foodPos: [{x: 1, y: 3}, {x: 3, y: 2}, {x: 3, y: 3}, {x: 1, y: 1}]}
let arr2 = {}
let arr3 = {...arr1, ...arr2}
console.log(arr3)

let testarr = [undefined, undefined, {x: 1, y: 0}]

for (itemIndex in testarr) {
  item = testarr[itemIndex]
  if (item) {
  console.log(item)
  }
}