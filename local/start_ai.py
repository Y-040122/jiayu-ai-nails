import getpass,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.environ['ARK_API_KEY']=getpass.getpass('请粘贴火山方舟 API Key（输入不显示）：').strip()
if not os.environ['ARK_API_KEY']:raise SystemExit('未输入密钥，未启动')
os.environ['JIAYU_SEEDREAM_MODEL']='doubao-seedream-5-0-pro-260628'
os.environ.setdefault('JIAYU_VISION_MODEL','doubao-seed-2-1-pro-260628')
os.execvp('python3',['python3','server.py'])
