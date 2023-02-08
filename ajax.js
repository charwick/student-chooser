"use strict";
var currentStudent = null,
	weights = {good: 1, meh: 0.5, bad: 0 };

document.addEventListener('DOMContentLoaded', () => {
	const actions = document.querySelectorAll('#actions button');
	
	//Chooser button
	const pick = document.getElementById('pick');
	if (pick) pick.addEventListener('click', function(e) {
		currentStudent = selectorFuncs[selector](roster);
		sinfo = document.getElementById('sinfo');
		sinfo.style.visibility = 'visible';
		document.getElementById('sname').innerHTML = currentStudent.fname+' '+currentStudent.lname;
		for (const btn of actions) {
			btn.disabled = false;
			btn.classList.remove('picked');
		}
	});

	//Result buttons
	for (const btn of actions) btn.addEventListener('click', function(e) {
		for (const btn2 of actions)  btn2.disabled = true;
		this.classList.add('picked');
		const req = new XMLHttpRequest();
		req.open('GET', 'ajax.php?req=writeevent&rosterid='+currentStudent.id+'&result='+weights[this.id], true);
		
		req.onload = () => {
			if (currentStudent.score == null) currentStudent.score = 0;
			currentStudent.score += weights[this.id];
			currentStudent.denominator++;
		};
		req.onerror = () => { console.log('There was an error'); };
		req.send();
	});

});

Array.prototype.random = function () { return this[Math.floor((Math.random()*this.length))]; }
const selectorFuncs = {
	//Unbiased random with replacement.
	rand: (list) => list.random(),
	
	//Random choice among students that have been called on the least so far.
	even: (list) => {
		list.sort((a,b) => { return a.denominator > b.denominator });
		const smallerList = [];
		for (const student of list)
			if (student.denominator == list[0].denominator)
				smallerList.push(student);
		
		return smallerList.random();
	},
	
	//Cycles through alphabetically, saving the position locally for the next session
	order: (list) => {
		if (!('lastStudent' in localStorage)) localStorage.lastStudent = list[list.length-1].id;
		let next = false;
		for (const student of list) {
			if (next) {
				localStorage.lastStudent = student.id;
				return student;
			}
			if (student.id == parseInt(localStorage['lastStudent'])) next = true;
		}
		localStorage.lastStudent = list[0].id;
		return list[0];
	}
}