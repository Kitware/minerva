#!/bin/bash

PREFIX="$CACHE/scala-$SCALA_VERSION"
if [[ ! -f "$PREFIX/bin/scala" || -n "$UPDATE_CACHE" ]] ; then
  rm -fr "$PREFIX"
  mkdir -p "$PREFIX"
  curl -L "http://www.scala-lang.org/files/archive/scala-${SCALA_VERSION}.tgz" | gunzip -c | tar -x -C "$PREFIX" --strip-components 1
fi
export SCALA_HOME="$PREFIX"
export PATH="$PREFIX/bin:$PATH"

PREFIX="$CACHE/spark-$SPARK_VERSION"
if [[ ! -f "$PREFIX/sbin/start-master.sh" || -n "$UPDATE_CACHE" ]] ; then
  rm -fr "$PREFIX"
  mkdir -p "$PREFIX"
  curl -L "http://d3kbcqa49mib13.cloudfront.net/spark-${SPARK_VERSION}-bin-hadoop2.4.tgz" | gunzip -c | tar -x -C "$PREFIX" --strip-components 1
fi
export SPARK_HOME="$PREFIX"
export PATH="$PREFIX/bin:$PREFIX/sbin:$PATH"
