const puppeteer = require('puppeteer')
const config = require('./config.json'); 

async function report (log) {
	currentTime = new Date();
	console.log(currentTime.toString().split('G')[0] + ': ' + log)
}
async function check_cart (page) {
	await page.waitForTimeout(500)
	try {
		//await page.waitForSelector('span.amount')
		var element = await page.$('span.amount')
		await report("Card in stock, attempting to purchase")
		var text = await page.evaluate(element => element.textContent, element);
		if (parseInt(text.split('$')[1]) > config.price_limit) {
			await report("Price exceeds limit but bot is currently not working correctly with this functionality")
			return false
		}
		return true
	} catch (err) {
		await report("Card not in stock")
		await page.waitForTimeout(config.refresh_time * 1000)
		return false
	}
}


async function run () {
	await report("Started")
	const browser = await puppeteer.launch({
        	headless: false,
        	defaultViewport: { width: 1366, height: 768 }
    	})
    	const page = await browser.newPage()
	
	await page.goto('http://newegg.com', { waitUntil: 'networkidle2' })
    	while (true) {
		await page.goto('https://secure.newegg.com/NewMyAccount/AccountLogin.aspx?nextpage=https%3a%2f%2fwww.newegg.com%2f', { waitUntil: 'load' })
		if (page.url().includes('signin')) {
			break;
		} else if (page.url().includes("areyouahuman")) {
			await page.waitForTimeout(1000)
		}
	}
	
	await page.waitForSelector('#labeled-input-signEmail')
    	await page.type('#labeled-input-signEmail', config.email)
	await page.waitForTimeout(500)
	await page.click('button.btn.btn-orange')
	await page.waitForTimeout(500)
	try {
		await page.type('#labeled-input-password', config.password)
		await page.waitForTimeout(500)
		await page.click('button.btn.btn-orange')
		await page.waitForNavigation({
			waitUntil: 'networkidle2',
		});

	} catch (err) {
		report("Manual authorization code required by Newegg.  This should only happen once.")
		while (page.url().includes('signin'))
		{
			await page.waitForTimeout(500)
		}
	}

	await report("Logged in")
	await report("Checking for card")

	while (true)
	{
		await page.goto('https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=' + config.item_number, { waitUntil: 'load' })
		if (page.url().includes("ShoppingCart")) {
			var check = await check_cart(page)
			if (check) {
				break
			}
		} else if (page.url().includes("ShoppingItem")) {
			await page.goto('https://secure.newegg.com/Shopping/ShoppingCart.aspx', { waitUntil: 'networkidle2' })
			await page.waitForTimeout(500)
			var check = await check_cart(page)
			if (check){
				break
			}
		} else if (page.url().includes("areyouahuman")) {
			await page.waitForTimeout(1000)
		}
	}
	try {
		await page.goto('javascript:attachDelegateEvent((function(){Biz.GlobalShopping.ShoppingCart.checkOut(\'True\')}))', {timeout: 500})
	} catch (err) {
	}
	
	await page.waitForSelector('#cvv2Code')
	await page.type('#cvv2Code', config.cv2)
	await page.click('#term')
	if (config.auto_submit == 'true') {
		await page.click('#SubmitOrder')
	}
	await report("Completed purchase")
    	//await browser.close()
}

run()
