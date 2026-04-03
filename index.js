import db from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  terminate,
} from "firebase/firestore";

/** create */
export async function createExample() {
  const docRef = await addDoc(collection(db, "users"), {
    name: "Ali",
    age: 25,
  });
  console.log(`ok, added a user doc, id is ${docRef.id}`);
  return docRef.id;
}

/** read */
export async function readExample() {
  const snapshot = await getDocs(collection(db, "users"));
  console.log("users right now:");
  snapshot.forEach((d) => {
    console.log(`  ${d.id}`, d.data());
  });
}

/** update */
export async function updateExample(docId) {
  if (!docId) {
    const snapshot = await getDocs(collection(db, "users"));
    if (snapshot.empty) {
      console.log("users is empty, add something first");
      return;
    }
    docId = snapshot.docs[0].id;
    console.log(`you didn't pass an id, using the first doc (${docId})`);
  }
  const ref = doc(db, "users", docId);
  await updateDoc(ref, { age: 26, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  console.log("after patch:", snap.data());
}

/** delete */
export async function deleteExample(docId) {
  if (!docId) {
    const snapshot = await getDocs(collection(db, "users"));
    if (snapshot.empty) {
      console.log("nothing to delete");
      return;
    }
    docId = snapshot.docs[0].id;
    console.log(`no id, deleting the first one (${docId})`);
  }
  await deleteDoc(doc(db, "users", docId));
  console.log(`deleted ${docId}`);
}

async function runAll() {
  console.log("running the whole thing: create, read, update, read, delete, read\n");
  const id = await createExample();
  await readExample();
  await updateExample(id);
  await readExample();
  await deleteExample(id);
  await readExample();
  console.log("\nall good");
}

const modes = new Set(["create", "read", "update", "delete", "all"]);
const mode = process.argv[2] ?? "all";

async function main() {
  try {
    if (!modes.has(mode)) {
      console.log(`usage: node index.js [create|read|update|delete|all]

  create   fake user in users
  read     print users
  update   mess with age (pass a doc id or it grabs the first)
  delete   same deal
  all      runs the full chain, default if you pass nothing`);
      process.exitCode = 1;
      return;
    }
    if (mode === "create") await createExample();
    else if (mode === "read") await readExample();
    else if (mode === "update") await updateExample(process.argv[3]);
    else if (mode === "delete") await deleteExample(process.argv[3]);
    else await runAll();
  } finally {
    await terminate(db);
  }
}

main();
