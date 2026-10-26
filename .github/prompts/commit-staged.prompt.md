---
description: "Review and commit only the changes that are already staged, using an English commit message."
name: "commit-staged"
argument-hint: "Optional context for the commit"
agent: agent
---

# Commit staged changes

Review and commit the changes that are already staged in this repository. Optional context: `${input:context:additional commit context}`.

Requirements:

- Check the working tree status and inspect the staged diff before committing.
- Include only changes already staged. Do not stage, unstage, discard, or otherwise modify files.
- If there are no staged changes, explain that and stop without creating a commit.
- Make sure the staged changes are coherent and do not include accidental secrets or unrelated files. If anything looks unsafe or unclear, stop and ask before committing.
- Write a concise, descriptive commit message in English that accurately summarizes the staged changes. Keep any commit body in English as well.
- Follow the repository's commit conventions and instructions, including any required commit trailers.
- Create the commit only after reviewing the staged diff. Do not amend existing commits, push, or make unrelated changes.
- After committing, report the commit hash and message.
