class Animal {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  speak(): void {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  breed: string;
  
  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }
  
  speak(): void {
    console.log(`${this.name} barks!`);
  }
  
  fetch(): void {
    console.log(`${this.name} fetches the ball`);
  }
}

class Cat extends Animal {
  color: string;
  
  constructor(name: string, color: string) {
    super(name);
    this.color = color;
  }
  
  speak(): void {
    console.log(`${this.name} meows!`);
  }
}

function createDog(name: string, breed: string): Dog {
  return new Dog(name, breed);
}

function createCat(name: string, color: string): Cat {
  return new Cat(name, color);
}

function main() {
  const myDog = createDog("Buddy", "Golden Retriever");
  const myCat = createCat("Whiskers", "Orange");
  
  myDog.speak();
  myDog.fetch();
  myCat.speak();
}

main();
