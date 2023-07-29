"use strict";
var hist = [], //Reverse coded: current student = index[0]
	histIndex = null,
	currentAnim = false;

document.addEventListener('DOMContentLoaded', () => {
	if ('roster' in window) for (const s in roster) if (roster[s].excuseduntil != null) {
		const exc = new Date(roster[s].excuseduntil);
		roster[s].excuseduntil = new Date(exc.getTime() + exc.getTimezoneOffset()*60000 + 24*3600*1000 - 1);
	}
	document.getElementById('actions')?.addEventListener('click', function(e) {
		e.preventDefault();
		if (e.target.id=='back') buttonFunc('back')(e);
		else if (e.target.id=='forward') buttonFunc('forward')(e);
		else if (e.target.id=='snooze') {
			const now = new Date(),
				req = new XMLHttpRequest();
			let excdate, fn;
			if (!isExcused(hist[histIndex].info)) { //Set excused
				excdate = now.toISOString().split('T')[0];
				fn = function() {
					now.setHours(23); now.setMinutes(59);
					hist[histIndex].info.excuseduntil = now;
					e.target.dataset.excused = 'Excused until tomorrow';
				}
			} else { //Clear excused
				excdate = '';
				fn = function() {
					hist[histIndex].info.excuseduntil = null;
					delete e.target.dataset.excused
				}
			}
			req.open('GET', 'ajax.php?req=studentexcused&id='+hist[histIndex].info.id+'&excused='+excdate, true);
			req.onload = fn;
			req.send();
		}
	});
	document.getElementById('pick')?.addEventListener('click', buttonFunc('choose'));
});

function StudentEvent(student) {
	this.info = student; //This will update the original roster data too
	this.event = null;
	this.result = null;
	this.excused = false;
	
	//Create the HTML
	this.element = document.createElement('div');
	this.element.classList.add('studentinfo');
	const h2 = document.createElement('h2'),
		note = document.createElement('p'),
		actionlist = document.createElement('ul'),
		actions = [];
	h2.innerHTML = this.info.fname+' '+this.info.lname;
	note.classList.add('note');
	note.innerHTML = this.info.note;
	for (const s in schema) {
		const li = document.createElement('li'),
			btn = document.createElement('button');
		btn.dataset.schema = s;
		btn.innerHTML = schema[s].text;
		btn.addEventListener('click', (e) => {
			for (const btn2 of actions) {
				btn2.disabled = true;
				btn2.classList.remove('picked');
			}
			this.send(schema[s].value)
		});
		li.append(btn);
		actionlist.append(li);
		actions.push(btn);
	}
	this.element.append(h2, note, actionlist);

	//Touch event handlers
	this.element.addEventListener('touchstart', (e) => {
		this.swipetime = new Date().getTime();
		this.swipepos = e.changedTouches[0].pageX;
		this.element.style.transition = 'none';
	});
	this.element.addEventListener('touchmove', (e) => {
		if (new Date().getTime() > this.swipetime + 100)
			this.element.style.left = 'calc(50% + '+(e.changedTouches[0].pageX-this.swipepos)+'px)';
	});
	this.element.addEventListener('touchend', (e) => {
		if (e.changedTouches[0].pageX-this.swipepos < -this.element.offsetWidth/3) {
			if (histIndex) buttonFunc('forward')();
			else buttonFunc('choose')();
		} else if (histIndex < hist.length-1 && e.changedTouches[0].pageX-this.swipepos > this.element.offsetWidth/3)
			buttonFunc('back')();
		this.element.style.transition = null;
		this.element.style.left = null;
	});

	this.send = function(result) {
		const req = new XMLHttpRequest(),
			that = this;
		let btn;
		for (const s in schema) if (schema[s].value==result) {
			btn = actionlist.querySelector('button[data-schema="'+s+'"]');
			break;
		}

		if (this.event) {
			//Undo button press
			if (result==this.result) {
				req.open('GET', 'ajax.php?req=deleteevent&event='+this.event, true);
				req.onload = function() {
					that.info.score -= that.result;
					that.info.denominator--;
					that.event = null;
					that.result = null;
					btn.classList.remove('picked');
					btn.parentNode.parentNode.classList.remove('picked');
					for (const btn2 of actions) btn2.disabled = false;
				}

			//Re-do button press (edit event)
			} else {
				req.open('GET', 'ajax.php?req=updateevent&event='+this.event+'&result='+result, true);
				req.onload = function() {
					for (const btn2 of actions) btn2.disabled = false;
					btn.classList.add('picked');
					that.info.score += result - that.result;
					that.result = result;
				}
			}
		
		//Send event (create new)
		} else {
			req.open('GET', 'ajax.php?req=writeevent&rosterid='+this.info.id+'&result='+result, true);
			req.onload = function() {
				for (const btn2 of actions) btn2.disabled = false;
				btn.classList.add('picked');
				btn.parentNode.parentNode.classList.add('picked');
				that.event = parseInt(this.response);
				that.result = result;
				if (that.info.score == null) that.info.score = 0;
				that.info.score += result;
				that.info.denominator++;
			};
		}

		req.onerror = () => { console.log('There was an error'); };
		req.send();
	};

	this.enter = function(left) {
		left = left ?? false;
		this.element.classList.add(left ? 'out' : 'in')
		document.getElementById('sinfo').append(this.element);

		const snoozeElement = document.getElementById('snooze');
		snoozeElement.classList.remove('disabled');
		if (isExcused(student)) snoozeElement.dataset.excused = 'Excused through '+student.excuseduntil.toLocaleDateString('en-us', {month: 'short', day: 'numeric', year: 'numeric'});
		else delete snoozeElement.dataset.excused;

		setTimeout(() => { this.element.classList.remove(left ? 'out' : 'in'); }, 1); //JS will skip the animation without the timeout
	}
	this.exit = function(right) {
		right = right ?? false;
		this.element.classList.add(right ? 'in' : 'out');
		setTimeout(() => {
			this.element.remove();
			this.element.classList.remove(right ? 'in' : 'out');
		}, 250);
	}
}

//=================
// BUTTON BEHAVIOR
//=================

function buttonFunc(action) {
	return function(e) {
		if (currentAnim) return;
		currentAnim = true;
		setTimeout(() => { currentAnim = false; }, 250);

		if (action=='choose') {
			const student = new StudentEvent(studentSelect(roster));
			if (histIndex != null) hist[histIndex].exit();
			if (hist[0]?.event) hist.unshift(student);
			else hist[0] = student;
			histIndex = 0;
			student.enter();
		
		} else if (action=='back') {
			hist[histIndex].exit(true);
			histIndex++;
			hist[histIndex].enter(true);
		
		} else if (action=='forward') {
			hist[histIndex].exit();
			histIndex--;
			hist[histIndex].enter();
		}
		setButtons();
	}
}

function setButtons() {
	if (histIndex < hist.length-1) document.getElementById('back').classList.remove('disabled');
	else document.getElementById('back').classList.add('disabled');
	if (histIndex) document.getElementById('forward').classList.remove('disabled');
	else document.getElementById('forward').classList.add('disabled');
}

Array.prototype.random = function () { return this[Math.floor((Math.random()*this.length))]; }

//Random choice among students that have been called on the least so far
function studentSelect(list) {
	const smallerList = [];
	list.sort((a,b) => {
		if (isExcused(a)) return 1; //Move excused to the end of the list
		if (isExcused(b)) return -1;
		return a.denominator > b.denominator ? 1 : -1;
	});
	for (const student of list)
		if (student.denominator == list[0].denominator && !isExcused(student))
			smallerList.push(student);
	
	return smallerList.random();
}

function isExcused(student) {
	const now = new Date();
	return student.excuseduntil?.getTime() > now.getTime();
}