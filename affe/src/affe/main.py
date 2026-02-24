"""
CLI entrypoint: read line from stdin or args, send to AFFE, print reply.
After pip install -e .: run with  affe  or  affe "What meetings tomorrow?"
"""
import sys

from affe.manager import handle


def main():
    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
    else:
        message = input("You: ").strip()
    if not message:
        return
    reply = handle(message)
    print("AFFE:", reply)


if __name__ == "__main__":
    main()
