import { describe, it, expect, beforeAll } from 'vitest';
import { TypeScriptCodeParser } from '../../src/core/code-parser/TypeScriptCodeParser.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TypeScriptCodeParser', () => {
  let parser: TypeScriptCodeParser;
  let tempDir: string;

  beforeAll(() => {
    parser = new TypeScriptCodeParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-test-'));
  });

  it('should parse a simple TypeScript file', () => {
    const testFile = path.join(tempDir, 'test.ts');
    fs.writeFileSync(testFile, `
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  speak() {
    console.log(this.name);
  }
}

class Dog extends Animal {
  breed: string;
  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }
  speak() {
    console.log(\`\${this.name} barks!\`);
  }
}

function createDog(name: string, breed: string): Dog {
  return new Dog(name, breed);
}

const myDog = createDog('Buddy', 'Golden Retriever');
myDog.speak();
`);

    const result = parser.parseFile(testFile);
    
    expect(result.codeEntities.length).toBeGreaterThan(0);
    expect(result.codeRelations.length).toBeGreaterThan(0);
    
    const classEntities = result.codeEntities.filter(n => n.entityData.type === 'Class');
    expect(classEntities.length).toBe(2);
    
    const funcEntities = result.codeEntities.filter(n => n.entityData.type === 'Function');
    expect(funcEntities.length).toBeGreaterThan(0);
  });

  it('should parse file with interfaces', () => {
    const testFile = path.join(tempDir, 'interfaces.ts');
    fs.writeFileSync(testFile, `
interface IAnimal {
  name: string;
  speak(): void;
}

interface IDog extends IAnimal {
  breed: string;
}

class Dog implements IDog {
  name: string;
  breed: string;
  constructor(name: string, breed: string) {
    this.name = name;
    this.breed = breed;
  }
  speak() {
    console.log(\`\${this.name} barks!\`);
  }
}
`);

    const result = parser.parseFile(testFile);
    const interfaceEntities = result.codeEntities.filter(n => n.entityData.type === 'Interface');
    
    expect(interfaceEntities.length).toBe(2);
  });
});
