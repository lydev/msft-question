import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const MAX_AUTOMATION_DURATION = 30; /// minutes
const TEST_SELECTION_API_URL = "https://tests-selection.azurewebsites.net/api";
const ChangeList = { file_list: ["changed_file1.ts", "changed_file2.ts"] };

interface ITest {
  test: string;
  duration: number;
}

interface IShard {
  id: number;
  tests: ITest[];
}

class TestInfo implements ITest {
  test: string;
  duration: number;
  constructor(fileName: string, duration: number) {
    this.test = fileName;
    this.duration = duration;
  }
}

class ShardInfo implements IShard {
  id: number;
  tests: ITest[];
  constructor(id: number) {
    this.id = id;
    this.tests = new Array();
  }
}

async function fetchTests(): Promise<TestInfo[]> {
  // const response = await axios.post(TEST_SELECTION_API_URL, ChangeList);
  // return response.data;
  return [
    { "test": "e2e_test1.test.ts", "duration": 6 },
    { "test": "e2e_test2.test.ts", "duration": 2 },
    { "test": "e2e_test3.test.ts", "duration": 10 },
    { "test": "e2e_test4.test.ts", "duration": 1 },
    { "test": "e2e_test5.test.ts", "duration": 2 },
    { "test": "e2e_test6.test.ts", "duration": 10 },
    { "test": "e2e_test7.test.ts", "duration": 6 },
    { "test": "e2e_test8.test.ts", "duration": 2 },
    { "test": "e2e_test9.test.ts", "duration": 10 },
    { "test": "e2e_test10.test.ts", "duration": 16 },
    { "test": "e2e_test11.test.ts", "duration": 12 },
    { "test": "e2e_test12.test.ts", "duration": 18 },
  ];
}

function distributeTests(tests: ITest[], durationLimit: number): IShard[] {
  const shards: IShard[] = [];
  if (tests.length < 1) {
    return shards;
  }

  tests.sort((a, b) => b.duration - a.duration);

  let idxStart = 0;
  let idxEnd = tests.length - 1;
  let countShard = 0;
  while (idxStart <= idxEnd) {
    const shard = new ShardInfo(countShard++);
    let durationSum = tests[idxStart].duration;
    shard.tests.push(tests[idxStart]);
    ++idxStart;

    if (durationSum > durationLimit) {
      console.warn(`${tests[idxStart].test} has duration longer than threshold.`);
      shards.push(shard);
      continue;
    }

    while (idxStart <= idxEnd &&
      (durationSum + tests[idxStart].duration) <= durationLimit) {
      durationSum += tests[idxStart].duration;
      shard.tests.push(tests[idxStart]);
      ++idxStart;
    }

    while (idxStart <= idxEnd &&
      (durationSum + tests[idxEnd].duration) <= durationLimit) {
      durationSum += tests[idxEnd].duration;
      shard.tests.push(tests[idxEnd]);
      --idxEnd;
    }
    shards.push(shard);
  }
  return shards;
}

function dumpShard(shard: IShard) {
  console.log(`shard id: ${shard.id}`);
  for (const test of shard.tests) {
    console.log(`test: ${test.test}    duration: ${test.duration}`);
  }
  console.log("---------------------");
}

function createShardFiles(shards: IShard[]) {
  const shardsDir = path.join(__dirname, 'shards');

  if (fs.existsSync(shardsDir)) {
    fs.rmSync(shardsDir, { recursive: true, force: true });
  }

  fs.mkdirSync(shardsDir);
  for (let idx = 0; idx < shards.length; ++idx) {
    const shard = shards[idx];
    const testFiles = Array.from(shard.tests, (test: ITest) => test.test);
    const shardFile = path.join(shardsDir, `shard${shard.id}.txt`);
    fs.writeFileSync(shardFile, testFiles.join('\n'));
    console.log(`Shard file created: ${shardFile}`);
    console.log(`${testFiles.join('\n')}`);
    console.log(`-----`);
  }
}

async function main() {
  const tests = await fetchTests();
  const shards = distributeTests(tests, MAX_AUTOMATION_DURATION);
  createShardFiles(shards);
  for (const shard of shards) {
    dumpShard(shard);
  }
}

main();

export function debug() {
}
