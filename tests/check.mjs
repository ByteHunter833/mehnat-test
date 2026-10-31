import Gio from 'gi://Gio'
import { evaluate, questions, sections } from '../dist/questions.js'
let passed = 0
function assert(value, message) {
	if (!value) throw new Error(message)
	passed++
}
assert(questions.length === 30, '30 questions')
assert(
	questions.every(
		(q, i) =>
			q.id === i + 1 && q.options.length === 4 && new Set(q.options).size === 4,
	),
	'Unique options and sequential ids',
)
assert(
	questions.map(q => q.correct).join('') === 'BDACBDACBDACBDACBDACBDACBDACBD',
	'Provided answer key',
)
assert(
	[0, 1, 2, 3]
		.map(s => questions.filter(q => q.section === s).length)
		.join(',') === '6,9,7,8',
	'Sections',
)
assert(
	!/[\u0400-\u04ff]/.test(JSON.stringify(questions)),
	'All question content uses Latin script',
)
for (const [score, grade] of [
	[0, 2],
	[16, 2],
	[17, 3],
	[21, 3],
	[22, 4],
	[25, 4],
	[26, 5],
	[30, 5],
]) {
	const answers = Object.fromEntries(
		questions.map((q, i) => [
			q.id,
			i < score ? q.correct : { A: 'B', B: 'C', C: 'D', D: 'A' }[q.correct],
		]),
	)
	const r = evaluate(answers)
	assert(
		r.score === score &&
			r.grade === grade &&
			r.wrong === 30 - score &&
			r.skipped === 0,
		`Grade boundary ${score}`,
	)
}
assert(evaluate({}).skipped === 30 && evaluate({}).score === 0, 'All skipped')
assert(
	evaluate({ 1: 'B', 2: 'A' }).wrong === 1 &&
		evaluate({ 1: 'B', 2: 'A' }).skipped === 28,
	'Mixed and skipped',
)
assert(evaluate({ 1: 'B' }).percent === '3.3', 'Percentage precision')

// A DOM adapter exercises the actual app handlers and storage lifecycle.
// Layout and native browser behavior still require a real browser check.
let content = {}
const nodes = new Map()
function element(selector) {
	if (!nodes.has(selector))
		nodes.set(selector, {
			innerHTML: '',
			textContent: '',
			hidden: false,
			value: '',
			onclick: null,
			handlers: {},
			addEventListener(type, handler) {
				this.handlers[type] = handler
			},
			querySelector(s) {
				return element(s)
			},
			focus() {},
			showModal() {
				this.open = true
			},
			close() {
				this.open = false
			},
		})
	return nodes.get(selector)
}
const appNode = element('#app')
const fakeDocument = { querySelector: element }
const fakeWindow = { scrollTo() {}, scrollY: 0 }
let blocked = false
const fakeStorage = {
	getItem(k) {
		if (blocked) throw Error('blocked')
		return content[k] || null
	},
	setItem(k, v) {
		if (blocked) throw Error('blocked')
		content[k] = v
	},
}
const source = new TextDecoder().decode(
	Gio.File.new_for_uri(import.meta.url)
		.get_parent()
		.get_parent()
		.get_child('dist/app.js')
		.load_contents(null)[1],
)
const boot = new Function(
	'document',
	'window',
	'localStorage',
	'crypto',
	'questions',
	'sections',
	'evaluate',
	source.replace(/^import .*\n/, '') +
		'\nreturn {state:()=>data, view:()=>view};',
)
const launch = () =>
	boot(
		fakeDocument,
		fakeWindow,
		fakeStorage,
		{ randomUUID: () => `attempt-${Date.now()}` },
		questions,
		sections,
		evaluate,
	)
const click = dataset =>
	appNode.handlers.click({ target: { closest: () => ({ dataset }) } })
const choose = value =>
	appNode.handlers.change({ target: { name: 'answer', value } })
let controller = launch()
assert(appNode.innerHTML.includes('Testni boshlash'), 'Start screen')
click({ action: 'start' })
assert(
	controller.view() === 'test' && appNode.innerHTML.includes('1 / 30'),
	'Start actual test',
)
assert(!appNode.innerHTML.includes('To‘g‘ri javob'), 'No answers revealed')
choose('A')
choose('B')
assert(controller.state().active.answers[1] === 'B', 'Answer can be changed')
click({ action: 'flag' })
click({ jump: '12' })
assert(
	controller.state().active.flags.includes(1) &&
		controller.state().active.current === 12,
	'Flag and jump',
)
controller = launch()
assert(
	controller.state().active.answers[1] === 'B' &&
		controller.state().active.current === 12,
	'Restore after reload',
)
click({ action: 'start' })
click({ action: 'finish' })
assert(
	element('#dialog-description').textContent.includes('29 ta savol'),
	'Skipped warning',
)
element('#cancel-finish').onclick()
assert(
	controller.state().active !== null && !element('#finish-dialog').open,
	'Cancel finish',
)
click({ action: 'finish' })
element('#confirm-finish').onclick()
assert(
	controller.state().active === null && controller.state().history.length === 1,
	'Finish persists history and clears active atomically',
)
assert(
	appNode.innerHTML.includes('1<span') &&
		appNode.innerHTML.includes('29</strong>Javobsiz'),
	'Result score and skips',
)
click({ filter: 'errors' })
assert(
	(appNode.innerHTML.match(/review-card/g) || []).length === 29,
	'Error filter includes skipped',
)
click({ action: 'fresh' })
assert(
	Object.keys(controller.state().active.answers).length === 0 &&
		controller.state().active.current === 0,
	'New empty attempt',
)
assert(controller.state().history.length === 1, 'Retake preserves history')
for (let i = 0; i < 30; i++) {
	click({ jump: String(i) })
	choose(questions[i].correct)
}
click({ action: 'finish' })
element('#confirm-finish').onclick()
assert(
	appNode.innerHTML.includes('100.0% natija') &&
		appNode.innerHTML.includes('A’lo'),
	'Perfect-score integration',
)
click({ filter: 'errors' })
assert(
	appNode.innerHTML.includes('Barcha javoblar to‘g‘ri!'),
	'Perfect-score empty error state',
)
element('#history-nav').onclick()
assert(
	controller.state().history.length === 2 &&
		appNode.innerHTML.includes('Natijani ko‘rish'),
	'History',
)
click({ result: controller.state().history[1].id })
assert(appNode.innerHTML.includes('3.3% natija'), 'Reopen earlier result')
controller = launch()
assert(
	controller.state().history.length === 2 && controller.state().active === null,
	'History survives reload',
)
blocked = true
controller = launch()
click({ action: 'start' })
choose('B')
assert(
	!element('#storage-warning').hidden &&
		controller.state().active.answers[1] === 'B',
	'Blocked storage permits in-memory test',
)
blocked = false
content = { 'mehnat-bilim-v1': '{broken' }
controller = launch()
click({ action: 'start' })
assert(controller.state().active.current === 0, 'Malformed storage recovery')
print(
	`PASS: ${passed} JavaScript content, grading, and application behavior checks.`,
)
