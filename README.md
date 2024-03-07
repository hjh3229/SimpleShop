현재 구현된 기능
회원가입

로그인

회원가입 기능 순서
1. name, email, password, phone, role을 입력받음
2. 같은 이메일로 가입된 user가 없는지 확인
3. 만약 있다면 이메일 already exist라는 메시지와 함께 에러 throw, 없다면 비밀번호를 argon2 알고리즘으로 해쉬한 뒤 user 데이터 저장


로그인 기능 순서
1. email과 password를 입력받음
2. 만약 일치하는 email이 없다면 throw, 있다면 해당 user의 password와 입력받은 password를 argon2.verify해서 일치하는지 확인
3. 위 절차를 통과하면 ip, endpoint, ua를 담은 token payload를 생성
4. 해당 payload를 담은 access token, refresh token 생성
5. access token은 개인정보 유출을 막기 위해, refresh token은 access token보다 만료 주기를 빠르게 하여 탈취 시 피해를 줄이기 위해
6. 또한 payload에 담긴 정보를 가지는 접근 기록도 생성한다. 이는 평소 유저의 ip, endpoint, ua가 아닌 다른 정보가 있다면 해킹을 우려해 잠시 접근을 막기 위함으로 보인다.
7. 해당 토큰을 가지고 권한이 필요한 요청들을 통과시킬 수 있다.

로그아웃 기능 순서
1. access token, refresh token의 비밀키를 확인한다.
2. 확인이 된다면 각 토큰을 통해 새로운 토큰을 발급하거나 요청을 보낼 수 없게 블랙리스트에 추가한다.
