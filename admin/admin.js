document.addEventListener('DOMContentLoaded', function() {
	
	document.querySelectorAll('.editable').forEach(addEditIcon); //Make items editable
	let roster = document.querySelector('#roster tbody');
	if (roster) roster.addEventListener('click', function(e) {
		if (!e.target.matches('.actions a')) return;
		e.preventDefault();
		let tr = e.target.parentNode.parentNode;
		if (e.target.classList.contains('edit')) makeInput(tr);
		else if (e.target.classList.contains('save')) tr.save();
		else if (e.target.classList.contains('delete')) {
			if (!confirm('Are you sure you want to delete the student '+tr.querySelector('.fname').textContent+' '+tr.querySelector('.lname').textContent+'?')) return;
			let req = new XMLHttpRequest();
			req.open('GET', '../ajax.php?req=deletestudent&id='+tr.dataset.id, true);
			req.onload = function() {
				if (parseInt(this.response) != 1) req.onerror();
				else {
					//Re-stripe the table
					let subsequent = tr;
					while (subsequent.nextElementSibling) {
						if (subsequent.nextElementSibling.classList.contains('odd')) subsequent.nextElementSibling.classList.remove('odd');
						else subsequent.nextElementSibling.classList.add('odd');
						subsequent = subsequent.nextElementSibling;
					}
					tr.remove();
					let snum = document.getElementById('num_students');
					snum.textContent = parseInt(snum.textContent)-1;
				}
			};
			req.onerror = function() {  };
			req.send();
		}
	});
	
	//Add new student
	let addStudent = document.querySelector('#addnew a');
	if (addStudent) addStudent.addEventListener('click', function(e) {
		e.preventDefault();
		if (this.classList.contains('disabled')) return;
		this.classList.add('disabled');
		
		let tr = studentRow('',''),
			cancel = tr.querySelector('.delete');
		makeInput(tr);
		cancel.classList.add('cancel');
		cancel.classList.remove('delete')
		cancel.textContent="×";
		tr.cancel = function() {
			tr.remove();
			document.querySelector('#addnew a').classList.remove('disabled');
		}
		cancel.addEventListener('click', function(e) {
			e.preventDefault();
			tr.cancel();
		});
		tr.save = function() {
			let after = function(response) {
				tr.dataset.id = response;
				let snum = document.getElementById('num_students');
				snum.textContent = parseInt(snum.textContent)+1;
				document.querySelector('#addnew a').classList.remove('disabled');
			}
			sendInfo(tr, 'addstudent', ['classid='+classid, 'fname='+tr.querySelector('.fname input').value, 'lname='+tr.querySelector('.lname input').value], after)
		}
	});
	
	//Handle CSV
	let csvElement = document.getElementById('csvfile');
	if (csvElement) csvElement.addEventListener('change', function(e) {
		if (this.files.length == 0) return;
		let reader = new FileReader();
		
		reader.onload = function(e) {
			let formData = new FormData(),
				req = new XMLHttpRequest();
			
			formData.append("csv", e.target.result);
			formData.append("req", "uploadroster");
			formData.append("class", ''+classid);
			req.open("POST", "../ajax.php", true);
			req.onload = function() {
				response = JSON.parse(this.response);
				csvElement.parentNode.innerHTML = "Uploaded "+response.length+" students";
				response.forEach(function(row) {
					let tr = studentRow(row['fname'], row['lname']);
					tr.dataset.id = row['id'];
				});
				document.getElementById('num_students').textContent = parseInt(document.getElementById('num_students').textContent) + response.length;
			};
			req.onerror = function() {
				let error = document.createElement('span');
				error.textContent = 'There was an error uploading this CSV.';
				csvElement.parentNode.insertBefore(error, csvElement);
			}
			req.send(formData);
		};
		reader.readAsText(this.files[0]);
	});
});

function addEditIcon(element) {
	let edit = document.createElement('a');
	edit.classList.add('edit');
	edit.textContent="✎";
	edit.href='#';
	edit.addEventListener('click', function(e) {
		e.preventDefault();
		makeInput(element);
	});
	element.appendChild(edit);
}

var editables = {
	name: {placeholder: 'Class Name'},
	year: {min: 2023, max: 2100, placeholder: 'year'},
}

//Turns an element into an input
function makeInput(element) {
	element.classList.add('editing');
	let inp;
	
	//Edit students
	if (element.tagName.toLowerCase() == 'tr') {
		inp = document.createElement('input');
		let inp2 = document.createElement('input'),
			ftd = element.querySelector('.fname'),
			ltd = element.querySelector('.lname');
		inp.value = ltd.textContent;
		inp2.value = ftd.textContent;
		inp.placeholder = 'Last Name';
		inp2.placeholder = 'First Name';
	
		element.save = function() { sendInfo(element, 'editstudent', ['student='+element.dataset.id, 'fname='+inp2.value, 'lname='+inp.value]); }
		let save = element.querySelector('.edit');
		save.classList.add('save');
		save.classList.remove('edit');
		save.textContent="✓";
	
		ftd.textContent = ''; ltd.textContent = '';
		ftd.append(inp2); ltd.append(inp);
		inp2.focus();
	
	//Edit class info
	} else {
		let item = element.id;
		if (element.dataset.inputtype=='select') {
			inp = document.createElement('select');
			let html = '', seasons = ['Spring', 'Fall', 'Winter', 'Summer'];
			seasons.forEach(function(s) { html += '<option value="'+s.toLowerCase()+'">'+s+'</option>'; })
			inp.innerHTML = html;
			inp.value = element.textContent.replace(/✎| /g,'').toLowerCase();
		} else {
			inp = document.createElement('input');
			inp.type = element.dataset.inputtype || 'text';
			inp.value = element.textContent.replace('✎','');
		}
		
		inp.name = item;
		if (item) inp.id = item;
		inp.classList.add('submittable');
		if (item in editables)
			for (const [attr,val] of Object.entries(editables[item]))
				inp.setAttribute(attr, val);
		
		element.save = function() { sendInfo(element, 'updateclassinfo', ['class='+classid, 'k='+inp.name, 'v='+inp.value]); };
		inp.addEventListener('blur', element.save);
		element.textContent = '';
		element.append(inp);
		inp.focus();
	}
	
	//Revert any changes
	element.cancel = function() {
		element.querySelectorAll('input,select').forEach(function(input) { input.value = input.oldValue; });
		solidify(element);
	}
	
	element.querySelectorAll('input,select').forEach(function(input) {
		input.oldValue = input.value;
		input.addEventListener('keydown', function(e) {
			if (e.key == "Enter") {
				e.preventDefault();
				element.save();
			} else if (e.key == "Escape") {
				e.preventDefault();
				element.cancel();
			}
		});
	});
	
	return inp;
}

//Turns an input back into an element
function solidify(el) {
	el.classList.remove('editing');
	let inps = el.querySelectorAll('input, select');
	inps.forEach(function(inp) {
		if (inp.tagName.toLowerCase() == 'select') inp.parentNode.textContent = inp.querySelector('[value="'+inp.value+'"]').textContent;
		else inp.parentNode.textContent = inp.value;
	});
	if (el.tagName.toLowerCase() != 'tr') addEditIcon(el);
	else { //Turn buttons back
		let edit = el.querySelector('.save'),
			del = el.querySelector('.cancel');
		edit.classList.add('edit');
		edit.classList.remove('save');
		edit.textContent="✎";
		if (del) {
			del.classList.add('delete');
			del.classList.remove('cancel');
			del.textContent="🗑	";
		}
	}
}

function sendInfo(element, command, data, after) {
	let inputs = element.querySelectorAll('input,select'), blank, changed;
	
	//Check for blank values
	inputs.forEach(function(inp) {
		inp.classList.remove('error');
		if (inp.value == '') {
			inp.classList.add('error');
			inp.focus();
			blank = true; //Can't return since it would only return from this inner forEach function
		}
		if (inp.value != inp.oldValue) changed = true;
	});
	if (blank) return;
		
	//Only make a request if the value has changed
	if (changed) {
		let req = new XMLHttpRequest();
		req.open('GET', '../ajax.php?req='+command+'&'+data.join('&'), true);
		req.onload = function() {
			if (!parseInt(this.response)) req.onerror();
			else {
				solidify(element);
				if (after instanceof Function) after(parseInt(this.response));
			}
		};
		req.onerror = function() { inputs.forEach(function(inp) { inp.classList.add('error'); }); };
		req.send();
	} else solidify(element);
}

function studentRow(col1, col2) {
	let stable = document.getElementById('roster').querySelector('tbody'),
		tr = document.createElement('tr');
	if (stable.childElementCount>1 && !stable.lastElementChild.classList.contains('odd')) tr.classList.add('odd');
	tr.innerHTML = '<td class="fname">'+col1+'</td><td class="lname">'+col2+'</td><td class="actions"><a href="#" class="edit">✎</a><a href="#" class="delete">🗑</a></td><td class="nullscore">—</td>';
	stable.append(tr);
	return tr;
}