import Conzole from './Conzole'
import I18n from './I18n'
import logo from './logo'
import translations from './translations.json'
import Program from './Program'
import OptionsProgram from './OptionsProgram'
import AboutProgram from './AboutProgram'
import LinksProgram from './LinksProgram'
import EloRapProgram from './EloRapProgram'
import HelpProgram from './HelpProgram'
import PrivacyPolicyProgram from './PrivacyPolicyProgram'
import ChangeLogProgram from './ChangeLogProgram'
import RepoProgram from './RepoProgram'
import optionsManager from './OptionsManager'
import { isMobile } from './helpers/helpers'
import packagejson from '../package.json'

class MKInfo {
  private mainEl: HTMLElement
  private conzole: Conzole
  private i18n: I18n
  private lang: string
  private privacyPolicyProgram: PrivacyPolicyProgram
  private programs: Program[]

  constructor(mainEl: HTMLElement) {
    optionsManager.setInitialTheme()
    this.mainEl = mainEl
    this.mainEl.innerHTML = ''
    this.conzole = new Conzole(this.mainEl, 'mk-info')
    this.lang = this.getLang()
    this.i18n = new I18n(translations, this.lang, 'en')
    this.privacyPolicyProgram = new PrivacyPolicyProgram(this.i18n)
    this.programs = [
      new OptionsProgram(this.i18n),
      new AboutProgram(this.i18n),
      new LinksProgram(this.i18n),
      new EloRapProgram(this.i18n),
      this.privacyPolicyProgram,
      new ChangeLogProgram(this.i18n),
      new RepoProgram(this.i18n)
    ]
    
    this.programs.push(
      new HelpProgram(this.i18n, this.programs)
    )
  }

  async start() {
    await this.printLogo()
    await this.conzole.print('')
    await this.printPrivacyPolicy()
    this.privacyPolicyProgram.bindPrivacyLink()
    await this.conzole.print('')
    await this.printHelloMessage()

    this.bindInputEvents()
    this.bindAutoFocusToActiveLineEvent()

    this.conzole.input()
  }

  bindAutoFocusToActiveLineEvent() {
    document.body.addEventListener('click', () => {
      this.conzole.focus()
    })
  }

  private getLang(): string {
    return optionsManager.setInitialLang()
  }

  private async printLogo() {
    const logoLines = logo.split('\n').filter(line => !!line.length)
    let belowLogoInfo: string | string[] = `v${packagejson.version}|© ${new Date().getFullYear()} Michal Koczkodon`
    let longestLogoLine = -1

    for (const line of logoLines) {
      if (line.length > longestLogoLine) longestLogoLine = line.length
    }

    await this.conzole.print(logoLines, {pauseMaxTime: 3}, 'logo')

    const belowLogoInfoSpaceLength = longestLogoLine - belowLogoInfo.length + 1

    if (belowLogoInfoSpaceLength > 0) {
      belowLogoInfo = belowLogoInfo.replace('|', new Array(belowLogoInfoSpaceLength).fill('&nbsp;').join(''))
    } else {
      belowLogoInfo.split('|')
    }

    await this.conzole.print(belowLogoInfo, false, 'app-info')
  }

  private async printPrivacyPolicy() {
    await this.conzole.print(this.i18n.key('helloPrivacy'))
  }

  private async printHelloMessage() {
    const helloMessage = [
      this.i18n.key('helloText'),
      ...(isMobile() ? [this.i18n.key('helloMobileText')] : []),
      this.i18n.key('helloHelpInfo')
    ]
  
    await this.conzole.print(helloMessage, true)
  }

  private bindInputEvents() {
    this.conzole.onInput(async (inputText) => {
      const mainCommand = inputText.trim().match(/^.+?(\s|$)/)[0]?.trim() || '';
      const programToRun = this.programs.find(program => program.getMainCommand() === mainCommand)

      if (programToRun) {
        await this.runProgram(programToRun, inputText)
      } else {
        await this.conzole.print(this.i18n.key('unknownProgram', mainCommand))
      }

      this.conzole.input()
    })
  }

  private async runProgram(program: Program, input: string) {
    let run = true
    let result = await program.run(input.replace(/^.+?(\s|$)/, ''))
    
    while (run) {
      if (!result.question) {
        run = false
      }

      if (result.err) {
        await this.conzole.print(result.err)
      }
  
      if (result.data) {
        if (typeof result.data === 'string') {
          await this.conzole.print(result.data)
        } else {
          if (result.data.print) {
            const printDataArray = Array.isArray(result.data.print) ? result.data.print : [result.data.print]
  
            for (const printData of printDataArray) {
              if (printData.type === 'printLazy') {
                await this.conzole.print(printData.output, true)
              } else if (printData.type === 'printKeyDescription') {
                await this.conzole.printKeyDescriptionList(printData.output)
              } else {
                await this.conzole.print(printData.output)
              }
            }
          }
        }
      }

      if (result.question) {
        const response = await this.conzole.question(result.question.text)
        result = result.question.callback(response)
      }
    }
  }
}

export default MKInfo