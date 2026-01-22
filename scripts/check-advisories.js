const https = require('https');
const fs = require('fs');
const path = require('path');

// .env 파일 로드 (로컬 개발용)
// GitHub Actions 환경에서는 이미 환경변수가 설정되어 있으므로 .env 파일이 없어도 됨
if (!process.env.GITHUB_ACTIONS) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (error) {
    // dotenv가 없거나 .env 파일이 없어도 계속 진행
    console.log('💡 .env 파일을 찾을 수 없습니다. 환경변수를 직접 설정해주세요.');
  }
}

// 설정
const DATA_FILE = path.join(__dirname, '../data/advisories.json');
const GOOGLE_CHAT_WEBHOOK = process.env.GOOGLE_CHAT_WEBHOOK;

// 실행 환경 로깅
const ENV_TYPE = process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local Development';
console.log(`🌍 실행 환경: ${ENV_TYPE}`);

/**
 * GitHub API를 통해 Angular 보안 권고사항 가져오기
 */
async function fetchSecurityAdvisories() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/angular/angular/security-advisories',
      method: 'GET',
      headers: {
        'User-Agent': 'Angular-Security-Monitor',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`JSON 파싱 실패: ${error.message}`));
          }
        } else {
          reject(new Error(`API 요청 실패: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * 이전에 확인된 권고사항 목록 로드
 */
function loadPreviousAdvisories() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('이전 데이터 로드 실패:', error.message);
  }
  return { advisories: [], lastChecked: null };
}

/**
 * 권고사항 목록 저장
 */
function saveAdvisories(advisories) {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const data = {
    advisories: advisories.map(adv => ({
      ghsa_id: adv.ghsa_id,
      summary: adv.summary,
      html_url: adv.html_url,
      published_at: adv.published_at,
      severity: adv.severity
    })),
    lastChecked: new Date().toISOString()
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Google Chat으로 메시지 전송
 */
async function sendToGoogleChat(newAdvisories) {
  if (!GOOGLE_CHAT_WEBHOOK) {
    console.log('⚠️  GOOGLE_CHAT_WEBHOOK 환경변수가 설정되지 않았습니다.');
    return;
  }

  const url = new URL(GOOGLE_CHAT_WEBHOOK);
  
  // 메시지 구성
  const cards = newAdvisories.map(adv => {
    const severityEmoji = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };

    return {
      header: {
        title: `${severityEmoji[adv.severity] || '⚠️'} ${adv.summary}`,
        subtitle: `Severity: ${adv.severity?.toUpperCase() || 'UNKNOWN'}`
      },
      sections: [{
        widgets: [
          {
            textParagraph: {
              text: `<b>GHSA ID:</b> ${adv.ghsa_id}<br><b>Published:</b> ${new Date(adv.published_at).toLocaleString('ko-KR')}`
            }
          },
          {
            buttons: [{
              textButton: {
                text: "상세보기",
                onClick: {
                  openLink: {
                    url: adv.html_url
                  }
                }
              }
            }]
          }
        ]
      }]
    };
  });

  const message = {
    text: `🚨 새로운 Angular 보안 권고사항이 ${newAdvisories.length}건 발견되었습니다!`,
    cards: cards
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Google Chat 알림 전송 완료');
          resolve();
        } else {
          console.error(`❌ Google Chat 알림 전송 실패: ${res.statusCode} - ${data}`);
          reject(new Error(`Google Chat 전송 실패: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Google Chat 요청 오류:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log('🔍 Angular 보안 권고사항 확인 시작...');
    console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`);
    
    // 현재 권고사항 가져오기
    const currentAdvisories = await fetchSecurityAdvisories();
    console.log(`📋 현재 총 ${currentAdvisories.length}개의 보안 권고사항 발견`);

    // 이전 권고사항 로드
    const previousData = loadPreviousAdvisories();
    const previousIds = new Set(previousData.advisories.map(adv => adv.ghsa_id));

    // 신규 권고사항 확인
    const newAdvisories = currentAdvisories.filter(adv => !previousIds.has(adv.ghsa_id));

    if (newAdvisories.length > 0) {
      console.log(`\n🆕 신규 보안 권고사항 ${newAdvisories.length}건 발견:`);
      newAdvisories.forEach(adv => {
        console.log(`  - [${adv.severity?.toUpperCase()}] ${adv.summary}`);
        console.log(`    ${adv.html_url}`);
      });

      // Google Chat으로 알림 전송
      await sendToGoogleChat(newAdvisories);

      // 권고사항 목록 업데이트
      saveAdvisories(currentAdvisories);
      
      // GitHub Actions output 설정
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'new_advisories=true\n');
      }
      
      console.log('\n✅ 처리 완료!');
    } else {
      console.log('\n✅ 신규 보안 권고사항 없음');
      saveAdvisories(currentAdvisories);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'new_advisories=false\n');
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
