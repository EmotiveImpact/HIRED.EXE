# Candidate and employer content

## Current edition

The recovered v0.3 source identifies the applicant as **Augustus Edem**, the company as **Solved Studio** and the role as **Builder**. It describes the candidate as a creative director and AI-native product builder. This is an independent application concept, not an official Solved Studio game or an endorsement.

The current edition file is `src/edition.js`, exposing `globalThis.HIRED_EDITION`. Keep employer-specific content there so the same game can serve future applications.

| Field | Purpose | Current basis |
| --- | --- | --- |
| `id` | Edition and progress namespace | `solved-001` in the recovered source |
| `company` | Employer displayed in the application | Solved Studio |
| `role` | Role being explored | Builder, as a draft label rather than a verified vacancy title |
| `applicant` | Candidate name | Augustus Edem |
| `editionLabel` | Display label | Solved Studio edition |
| `intro` | Short personal framing | Creative director and AI-native product builder entering a playful hiring process |
| `portfolio` | Project name, description and optional URL | Existing project entries below |
| `contactUrl` | Candidate's preferred contact action | Existing candidate mailto in recovered source |
| `levels`, if present | Display copy for the four worlds | Titles and short objectives; mechanics remain in level data |

## Portfolio provenance

| Project | Description in recovered source | Public URL in recovered source |
| --- | --- | --- |
| Vlume | Multi-output audio routing and synchronisation product | None configured |
| Commune | Community-focused digital product | None configured |
| Cairn | Mac storage management application | None configured |

The supplied conversation context also mentions SALEANE and private repositories. Those names do not establish a public URL, published case study, product metric or launch status. Do not infer missing details. Add a project only with accurate candidate-supplied wording.

Where a URL is absent, show the project name and description as text. A missing URL must not become a fake button or a guessed domain. The existing email destination is `emotiveimpact@gmail.com`; using a mailto opens a draft in the visitor's mail application and does not itself send a message.

## Reusing the game for another employer

Duplicate the edition content, choose a new stable `id`, replace the employer and role, then write a short introduction that connects the work to that organisation. Select the most relevant genuine projects and add only verified public links or explicitly permitted private viewing routes. Keep the candidate's own voice and work visible.

The reusable part is the game. The application still needs a reason for that particular employer. A generic employer-name substitution is technically convenient but gives the reader less useful information than a specific introduction and a carefully selected portfolio.

### Example shape

```js
globalThis.HIRED_EDITION = {
  id: 'employer-role-001',
  company: 'Employer name',
  role: 'Role title',
  applicant: 'Augustus Edem',
  editionLabel: 'EMPLOYER EDITION / 001',
  intro: 'A concise, accurate reason for this application.',
  portfolio: [
    { name: 'Project name', description: 'Verified description.', url: null }
  ],
  contactUrl: null
};
```

This is an illustrative schema. Keep required fields used by the actual application when editing the delivered edition file.

## Writing rules

Use British English and short sentences. The humour comes from familiar application friction, such as overfull inboxes and scope creep. The candidate remains capable and warm. Avoid invented hiring guarantees, real staff caricatures and claims that a company has approved the work.

Use “creative director and AI-native product builder” consistently. Where describing the process, say the candidate directs AI coding agents, understands product flows, tests and ships work. Do not imply independent fluency in a particular programming language without evidence.

The final interaction should lead to the portfolio and a conversation. Completion means the visitor finished the adventure. It does not mean a real employer hired the candidate. Keep a direct portfolio route available for someone who has two minutes, uses assistive technology or simply does not want to play.

## Before sending an application

Review the exact role and company wording, test configured links, confirm the preferred contact address and give the build a human playthrough on the intended devices. This is a content and quality handoff, not a requirement to publish or submit anything automatically.
