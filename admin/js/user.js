"use strict";
document.addEventListener('DOMContentLoaded', () => {
	function fieldData(inputs) { return ['req=edituser', 'k='+inputs[0].name, 'v='+inputs[0].value] }
	makeEditable(document.getElementById('email'), {type: 'email', placeholder: 'Email Address', request: 'edituser', data: fieldData});

	const password = document.querySelector('#password');

	function inlineError(element, message) {
		let error = document.createElement('span');
		error.classList.add('inlineError');
		error.textContent = message;
		element.append(error);
	}

	function pwerror(response, inputs) {
		inputs[0].classList.add('error');
		inlineError(inputs[0].parentNode.parentNode, 'Current password is incorrect.');
	}
	function pwafter(response) {
		let i=0;
		for (const span of password.querySelectorAll('.field')) {
			span.textContent = i ? '' : '••••••••';
			i++;
		}
	}

	function pwedit(e) {
		const element = e.target.parentNode.parentNode,
			fields = Array.from(element.querySelectorAll('.field'));
		if (e.target.classList.contains('edit')) {
			makeInput(fields, {type: 'password', placeholder: ['Current Password', 'New Password', 'Confirm New Password']});
			
			for (const inp of element.querySelectorAll('input')) {
				inp.value = '';
				console.log(inp.value);
				inp.parentNode.save = function() {
					const error = element.querySelector('.inlineError');
					if (error) error.remove();
					const oldpw = element.querySelector('input[name="oldpw"]')
						newpw = element.querySelector('input[name="newpw"]'),
						confirmpw = element.querySelector('input[name="confirmpw"]');
					if (newpw.value != confirmpw.value) {
						newpw.classList.add('error');
						confirmpw.classList.add('error');
						inlineError(element, 'Passwords do not match.');
						return;
					}

					if (oldpw.value == newpw.value) {
						fields[0].cancel();
						return;
					}
					sendInfo(fields, ['req=editpw', 'current='+oldpw.value, 'new='+newpw.value], ['edit'], pwafter, pwerror);
				}
			}
		
		} else if (e.target.classList.contains('cancel')) element.querySelector('.field').cancel();
		else if (e.target.classList.contains('save')) element.querySelector('.field').save();
	}
	password.addEventListener('click', pwedit);
});